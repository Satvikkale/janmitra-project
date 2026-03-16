import { Injectable, Logger } from '@nestjs/common';
import { OrgsService } from '../orgs/orgs.service';

type ComplaintRoutingParams = {
  category: string;
  subcategory?: string;
  description?: string;
  location?: { lat: number; lng: number };
};

type RoutableNgo = {
  _id?: { toString(): string } | string;
  name?: string;
  subtype?: string;
  description?: string;
  categories?: string[];
  isVerified?: boolean;
  type?: string;
};

type ComplaintRoutingResult = {
  org: RoutableNgo | null;
  score: number;
  reason: string;
};

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly minimumConfidenceScore = 8;
  private readonly nonNgoInfrastructureKeywords = [
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

  private isNonNgoInfrastructureComplaint(params: ComplaintRoutingParams) {
    const rawText = this.normalizeText(
      [params.category, params.subcategory, this.sanitizeDescription(params.description)].filter(Boolean).join(' '),
    );
    return this.nonNgoInfrastructureKeywords.some((keyword) => rawText.includes(keyword));
  }

  private scoreNgoCandidate(ngo: RoutableNgo, complaintTerms: string[]) {
    const subtype = this.normalizeText(ngo?.subtype);
    const name = this.normalizeText(ngo?.name);
    const description = this.normalizeText(ngo?.description);
    const categoryTerms = Array.isArray(ngo?.categories)
      ? ngo.categories.flatMap((category: string) => this.tokenize(category))
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

    return { score, matchedTerms: Array.from(matchedTerms) };
  }

  /**
   * Pick best NGO based on complaint category, subtype-aligned keywords, and org categories.
   */
  async pickOrg(params: ComplaintRoutingParams): Promise<ComplaintRoutingResult> {
    try {
      if (this.isNonNgoInfrastructureComplaint(params)) {
        return {
          org: null,
          score: 0,
          reason: `Civic infrastructure complaint category "${params.category}" is excluded from NGO auto-routing.`,
        };
      }

      const complaintTerms = this.collectComplaintTerms(params);
      const ngos = await this.orgs.getAllNgos();
      const verifiedNgos = (ngos || []).filter((ngo: RoutableNgo) => ngo?.type === 'NGO' && ngo?.isVerified !== false);

      let bestMatch: { org: RoutableNgo; score: number; matchedTerms: string[] } | null = null;

      for (const ngo of verifiedNgos) {
        const candidate = this.scoreNgoCandidate(ngo, complaintTerms);
        if (!bestMatch || candidate.score > bestMatch.score) {
          bestMatch = { org: ngo, score: candidate.score, matchedTerms: candidate.matchedTerms };
        }
      }

      if (bestMatch && bestMatch.score >= this.minimumConfidenceScore) {
        const reason = `Matched NGO subtype "${bestMatch.org?.subtype || 'general'}" using terms: ${bestMatch.matchedTerms.join(', ') || params.category}.`;
        this.logger.log(`NGO picked for category ${params.category}: ${bestMatch.org?._id || 'none'} (score ${bestMatch.score})`);
        return { org: bestMatch.org, score: bestMatch.score, reason };
      }
      return {
        org: null,
        score: bestMatch?.score || 0,
        reason: `No NGO subtype match met the confidence threshold for complaint category "${params.category}".`,
      };
    } catch (error) {
      this.logger.error('Error picking org', error.stack);
      throw error;
    }
  }
}