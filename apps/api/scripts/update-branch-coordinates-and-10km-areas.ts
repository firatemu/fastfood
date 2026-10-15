import { PrismaClient } from '../prisma/generated/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { generateCirclePolygon } from '../src/modules/branch/routing/routing.service.js';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://fastfood:fastfood@localhost:5439/fastfood?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * Accurate coordinates based on official branch addresses:
 */
const ACCURATE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // ADANA ŞUBELERİ
  'ADA-T-OZAL': { lat: 37.040278, lng: 35.314167 }, // Turgut Özal Bulvarı, Çukurova/Adana
  'ADA-UGUR-MUMCU': { lat: 37.000302, lng: 35.320804 }, // Uğur Mumcu Bulvarı, Çukurova/Adana
  'ADA-ZIYAPASA': { lat: 36.998648, lng: 35.326154 }, // Kurtuluş Mah. Şinasi Efendi Cad., Seyhan/Adana
  'ADA-BELEDIYE': { lat: 37.017131, lng: 35.242665 }, // Belediye Evleri Mah., Çukurova/Adana
  'ADA-M1': { lat: 37.012526, lng: 35.26901 }, // Yeni Mah. Öğretmenler Bulvarı M1 AVM, Seyhan/Adana
  'ADA-YUREGIR': { lat: 36.997278, lng: 35.3528 }, // Kiremithane Dadaloğlu Blv, Yüreğir/Adana
  'ADA-SARICAM': { lat: 37.044572, lng: 35.398241 }, // Çarkıpare Mah. Elif Su Uludağ Cad., Sarıçam/Adana
  'ADA-OFIS': { lat: 37.017538, lng: 35.243357 }, // Dr. Sadık Ahmet Bulvarı Ofis, Çukurova/Adana
  'ADA-URETIM': { lat: 37.016931, lng: 35.242195 }, // Dr. Sadık Ahmet Bulvarı Üretim Tesisi, Çukurova/Adana

  // MERSİN ŞUBELERİ
  'MER-MEZITLI': { lat: 36.783134, lng: 34.577617 }, // Yeni Mah. GMK Blv., Mezitli/Mersin
  'MER-YENISEHIR': { lat: 36.789289, lng: 34.606518 }, // Adnan Menderes Bulv., Yenişehir/Mersin

  // GAZİANTEP ŞUBELERİ
  'GAZ-OSMANGAZI': { lat: 37.075472, lng: 37.332841 }, // Osmangazi Mah., Şehitkamil/Gaziantep
  'GAZ-BATIKENT': { lat: 37.081546, lng: 37.339552 }, // Batıkent Mah. Kürşat Tüzmen Bulv., Şehitkamil/Gaziantep

  // OSMANİYE ŞUBESİ
  'OSM-OSMANIYE': { lat: 37.066701, lng: 36.242504 }, // Rauf Bey Mh., Merkez/Osmaniye

  // İSTANBUL ŞUBESİ
  'IST-DT': { lat: 41.0369, lng: 28.9847 }, // Moda Caddesi 12, Kadıköy, İstanbul
};

async function main() {
  console.log('--- 1. Updating Branch Coordinates ---');
  for (const [code, coords] of Object.entries(ACCURATE_COORDINATES)) {
    const updated = await prisma.branch.updateMany({
      where: { code },
      data: {
        latitude: coords.lat,
        longitude: coords.lng,
      },
    });
    console.log(`Updated [${code}]: lat=${coords.lat}, lng=${coords.lng} (${updated.count} row)`);
  }

  console.log('\n--- 2. Updating Service Areas to 10km Customer Distance ---');
  const branches = await prisma.branch.findMany();

  for (const branch of branches) {
    // Delete existing service areas for this branch
    await prisma.serviceArea.deleteMany({
      where: { branchId: branch.id },
    });

    const lat = Number(branch.latitude);
    const lng = Number(branch.longitude);

    // Generate circle polygon with 10.0 km radius (any point inside is <= 10 km from branch)
    const polygon = generateCirclePolygon(lat, lng, 10.0, 64);

    const sa = await prisma.serviceArea.create({
      data: {
        branchId: branch.id,
        name: `${branch.name} — Maks. 10km Müşteri Uzaklığı`,
        polygonGeoJson: polygon as object,
        priority: 1,
        isActive: true,
      },
    });

    console.log(`Created 10km customer distance area for [${branch.name}] -> Area ID: ${sa.id}`);
  }

  console.log('\n✅ All branch service areas set to Maks. 10km Müşteri Uzaklığı!');
}

main()
  .catch((e) => {
    console.error('Error running update script:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
