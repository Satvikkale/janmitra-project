import { Injectable, Logger } from '@nestjs/common';
import { OrgsService } from '../orgs/orgs.service';

type ComplaintRoutingParams = {
  category: string;
  subcategory?: string;
  description?: string;
  location?: { lat: number; lng: number };
};

type RoutableOrg = {
  _id?: { toString(): string } | string;
  name?: string;
  subtype?: string;
  description?: string;
  categories?: string[];
  isVerified?: boolean;
  type?: string;
  location?: { type: 'Point'; coordinates: number[] };
  serviceRadiusKm?: number;
};

type ComplaintRoutingResult = {
  org: RoutableOrg | null;
  score: number;
  reason: string;
};

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly minimumConfidenceScore = 8;
  private readonly infrastructureKeywords = [
    'broken road',
    'road damage',
    'road repair',
    'road construction',
    'pothole',
    'street light',
    'streetlight',
    'drainage blockage',
    'blocked drain',
    'water leak',
    'water pipeline',
    'pipe burst',
    'electrical issue',
    'power outage',
    'sewer line',
    'sewage overflow',
  ];

  private readonly infrastructureDomainKeywords = [
    'infrastructure',
    'civic infrastructure',
    'construction',
    'road',
    'pothole',
    'drain',
    'drainage',
    'sewer',
    'sewage',
    'water pipeline',
    'water',
    'electrical',
    'power',
    'utility',
    'public works',
  ];

  private readonly socialKeywords = [
    'waste',
    'garbage',
    'trash',
    'litter',
    'sanitation',
    'cleanliness',
    'cleanup',
    'health',
    'medical',
    'hospital',
    'clinic',
    'education',
    'school',
    'student',
    'teacher',
    'women',
    'woman',
    'girl',
    'child',
    'children',
    'elderly',
    'disability',
    'food',
    'hunger',
    'shelter',
    'livelihood',
    'legal',
  ];

  private readonly infrastructurePreferredTypes: Record<string, number> = {
    gov: 18,
    utility: 16,
    organization: 12,
    ngo: 5,
    private: 3,
  };

  private readonly socialPreferredTypes: Record<string, number> = {
    ngo: 16,
    organization: 12,
    gov: 6,
    utility: 4,
    private: 2,
  };

  private readonly generalPreferredTypes: Record<string, number> = {
    ngo: 8,
    organization: 8,
    gov: 6,
    utility: 6,
    private: 3,
  };

  constructor(private orgs: OrgsService) {}

  private readonly subtypeKeywordMap: Record<string, string[]> = {
    health: ['health', 'medical', 'medicine', 'hospital', 'clinic', 'hygiene'],
    education: ['education', 'school', 'student', 'teacher', 'learning', 'literacy'],
    environment: ['environment', 'pollution', 'cleanliness', 'cleanup'],
    'waste management': ['waste', 'garbage', 'trash', 'litter', 'bin', 'dump', 'dumping', 'collection'],
    sanitation: ['sanitation', 'cleanliness', 'garbage', 'waste', 'sewage'],
    food: ['food', 'hunger', 'nutrition', 'meal', 'ration'],
    shelter: ['shelter', 'housing', 'home', 'homeless'],
    women: ['women', 'woman', 'girl', 'gender', 'safety'],
    child: ['child', 'children', 'kid', 'kids', 'juvenile'],
    elderly: ['elderly', 'senior', 'old age', 'aging'],
    disability: ['disability', 'disabled', 'accessibility', 'special needs'],
    livelihood: ['employment', 'job', 'livelihood', 'skill', 'income'],
    disaster: ['disaster', 'flood', 'fire', 'earthquake', 'emergency', 'relief'],
    legal: ['legal', 'law', 'rights', 'documentation', 'certificate'],
    community: ['community', 'resident', 'society', 'social'],
  };

  private normalizeText(value?: string) {
    return (value || '').toLowerCase();
  }

  private sanitizeDescription(value = '') {
    const text = value;
    return text
      .replaceAll(/Source society:[^.]*.?/gi, ' ')
      .replaceAll(/Location:[^.]*.?/gi, ' ')
      .replaceAll(/Routed to NGO:[^.]*.?/gi, ' ')
      .replaceAll(/Matched NGO subtype[^.]*.?/gi, ' ')
      .trim();
  }

  private tokenize(value?: string) {
    return Array.from(
      new Set(
        this.normalizeText(value)
          .replaceAll(/[^a-z0-9]+/g, ' ')
          .split(' ')
          .map((token) => token.trim())
          .filter((token) => token.length > 2),
      ),
    );
  }

  private collectComplaintTerms(params: ComplaintRoutingParams) {
    const cleanedDescription = this.sanitizeDescription(params.description);
    const rawText = [params.category, params.subcategory, cleanedDescription].filter(Boolean).join(' ');
    const tokens = this.tokenize(rawText);
    const mappedKeywords = Object.entries(this.subtypeKeywordMap)
      .filter(([, keywords]) => keywords.some((keyword) => this.normalizeText(rawText).includes(keyword)))
      .flatMap(([subtype, keywords]) => [subtype, ...keywords]);

    return Array.from(new Set([...tokens, ...mappedKeywords]));
  }

  private getComplaintBucket(params: ComplaintRoutingParams, complaintTerms: string[]) {
    const rawText = this.normalizeText(
      [params.category, params.subcategory, this.sanitizeDescription(params.description)].filter(Boolean).join(' '),
    );
    if (this.infrastructureKeywords.some((keyword) => rawText.includes(keyword))) {
      return 'infrastructure' as const;
    }

    const termText = complaintTerms.join(' ');
    if (this.socialKeywords.some((keyword) => termText.includes(keyword) || rawText.includes(keyword))) {
      return 'social' as const;
    }

    return 'general' as const;
  }

  private getTypePreferenceBonus(org: RoutableOrg, bucket: 'infrastructure' | 'social' | 'general') {
    const typeKey = this.normalizeText(org?.type) || 'general';
    const table =
      bucket === 'infrastructure'
        ? this.infrastructurePreferredTypes
        : bucket === 'social'
          ? this.socialPreferredTypes
          : this.generalPreferredTypes;
    return table[typeKey] || 0;
  }

  private isInfrastructureDomainOrg(org: RoutableOrg) {
    const corpus = this.normalizeText(
      [
        org?.subtype,
        org?.name,
        org?.description,
        ...(Array.isArray(org?.categories) ? org.categories : []),
      ]
        .filter(Boolean)
        .join(' '),
    );

    return this.infrastructureDomainKeywords.some((keyword) => corpus.includes(keyword));
  }

  private scoreOrgCandidate(org: RoutableOrg, complaintTerms: string[], bucket: 'infrastructure' | 'social' | 'general') {
    const subtype = this.normalizeText(org?.subtype);
    const name = this.normalizeText(org?.name);
    const description = this.normalizeText(org?.description);
    const categoryTerms = Array.isArray(org?.categories)
      ? org.categories.flatMap((category: string) => this.tokenize(category))
      : [];
    const subtypeTerms = this.tokenize(subtype);
    const nameTerms = this.tokenize(name);
    const descriptionTerms = this.tokenize(description);

    let score = 0;
    const matchedTerms = new Set<string>();

    for (const term of complaintTerms) {
      if (subtype?.includes(term)) {
        score += 12;
        matchedTerms.add(term);
      }
      if (subtypeTerms.includes(term)) {
        score += 8;
        matchedTerms.add(term);
      }
      if (categoryTerms.includes(term)) {
        score += 6;
        matchedTerms.add(term);
      }
      if (nameTerms.includes(term) || descriptionTerms.includes(term)) {
        score += 3;
        matchedTerms.add(term);
      }
    }

    score += this.getTypePreferenceBonus(org, bucket);

    return { score, matchedTerms: Array.from(matchedTerms) };
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Pick the best organization based on complaint category, location constraints, and subtype-aligned keywords.
   */
  async pickOrg(params: ComplaintRoutingParams): Promise<ComplaintRoutingResult> {
    try {
      const complaintTerms = this.collectComplaintTerms(params);
      const complaintBucket = this.getComplaintBucket(params, complaintTerms);
      const orgs = await this.orgs.listAll();
      const verifiedOrgs = (orgs || []).filter((org: RoutableOrg) => org?.type && org?.isVerified !== false);

      let bestMatch: { org: RoutableOrg; score: number; matchedTerms: string[] } | null = null;
      let bestInfrastructurePreferred: { org: RoutableOrg; score: number; matchedTerms: string[] } | null = null;
      let bestInfrastructureFallback: { org: RoutableOrg; score: number; matchedTerms: string[] } | null = null;
      const preferredInfrastructureTypes = new Set(['gov', 'utility']);

      for (const org of verifiedOrgs) {
        let proximityScore = 0;
        let isWithinCoverage = true;

        // Perform geographic matching if both entities have location data available
        if (params.location && org.location?.coordinates) {
          const [orgLng, orgLat] = org.location.coordinates;
          const distKm = this.calculateDistanceKm(params.location.lat, params.location.lng, orgLat, orgLng);
          const radius = org.serviceRadiusKm || 10; // Fallback to 10km if radius not set

          if (distKm > radius) {
            isWithinCoverage = false; // Organization is too far away from the complaint
          } else {
            // Calculate a proximity bonus: +5 points for being right next to it, scaling down to 0 at the edge of the radius
            proximityScore = 5 * (1 - (distKm / radius));
          }
        }

        // Strictly enforce geographic bounds — skip NGOs that don't cover the location
        if (params.location && org.location?.coordinates && !isWithinCoverage) {
          continue;
        }

        const candidate = this.scoreOrgCandidate(org, complaintTerms, complaintBucket);
        const typeKey = this.normalizeText(org.type);
        const worksInInfrastructureDomain = this.isInfrastructureDomainOrg(org);

        if (candidate.score === 0 && complaintBucket === 'infrastructure') {
          if (typeKey === 'gov' || typeKey === 'utility') {
            candidate.score = this.infrastructurePreferredTypes[typeKey] || 0;
            candidate.matchedTerms.push('infrastructure');
          } else if (worksInInfrastructureDomain) {
            candidate.score = 9;
            candidate.matchedTerms.push('infrastructure-domain');
          }
        }

        if (complaintBucket === 'infrastructure' && worksInInfrastructureDomain && !preferredInfrastructureTypes.has(typeKey)) {
          candidate.score += 4;
          candidate.matchedTerms.push('domain-specialist');
        }

        if (candidate.score === 0) continue;

        const finalScore = candidate.score + proximityScore;

        if (complaintBucket === 'infrastructure') {
          if (preferredInfrastructureTypes.has(typeKey)) {
            if (!bestInfrastructurePreferred || finalScore > bestInfrastructurePreferred.score) {
              bestInfrastructurePreferred = { org, score: finalScore, matchedTerms: candidate.matchedTerms };
            }
          } else if (worksInInfrastructureDomain || candidate.matchedTerms.length > 0) {
            if (!bestInfrastructureFallback || finalScore > bestInfrastructureFallback.score) {
              bestInfrastructureFallback = { org, score: finalScore, matchedTerms: candidate.matchedTerms };
            }
          }
          continue;
        }

        if (!bestMatch || finalScore > bestMatch.score) {
          bestMatch = { org, score: finalScore, matchedTerms: candidate.matchedTerms };
        }
      }

      if (complaintBucket === 'infrastructure') {
        bestMatch = bestInfrastructurePreferred || bestInfrastructureFallback;
      }

      if (bestMatch && bestMatch.score >= this.minimumConfidenceScore) {
        const reason = `Matched ${bestMatch.org?.type || 'organization'} subtype "${bestMatch.org?.subtype || 'general'}" using terms: ${bestMatch.matchedTerms.join(', ') || params.category}.`;
        this.logger.log(`Org picked for category ${params.category}: ${bestMatch.org?._id || 'none'} (score ${bestMatch.score})`);
        return { org: bestMatch.org, score: bestMatch.score, reason };
      }
      return {
        org: null,
        score: bestMatch?.score || 0,
        reason: `No organization match met the confidence threshold for complaint category "${params.category}".`,
      };
    } catch (error) {
      this.logger.error('Error picking org', error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }
}