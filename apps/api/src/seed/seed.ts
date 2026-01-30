import 'dotenv/config';
import mongoose from 'mongoose';
import { Org, OrgSchema } from '../orgs/orgs.schema';

async function run() {
  const uri = process.env.MONGO_URI!;
  await mongoose.connect(uri);
  const OrgModel = mongoose.model(Org.name, OrgSchema);

  // Wipe demo
  await OrgModel.deleteMany({ name: { $in: ['City Municipal Corporation', 'Clean Streets NGO'] } });

  // Municipal (Gov) handles sanitation, streetlight, drainage, pothole
  await OrgModel.create({
    name: 'City Municipal Corporation',
    type: 'Gov',
    subtype: 'Municipal Corporation',
    city: 'DemoCity',
    categories: ['sanitation','streetlight','drainage','pothole','waste'],
    // no jurisdiction for demo; add GeoJSON later
    settings: { workingHours: 'Mon-Sat 09:00-18:00' },
  });

  // NGO handles cleanliness campaigns and welfare events
  await OrgModel.create({
    name: 'Clean Streets NGO',
    type: 'NGO',
    subtype: 'Sanitation NGO',
    city: 'DemoCity',
    categories: ['campaign','cleanup','welfare_event'],
  });

  console.log('Seeded demo orgs.'); process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });