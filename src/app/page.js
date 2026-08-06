import { getFestivals } from "@/features/festivals/festival-queries";
import { mapFestivalsToCards } from "@/lib/festival-mapper";
import { FESTIVAL_STATUS } from "@/lib/constants";
import { articles } from "@/lib/festivals";
import { neighborhoods } from "@/lib/neighborhoods";
import { HomeClient } from "@/components/home/HomeClient";

export default async function Home() {
  const { festivals: dbFestivals } = await getFestivals({
    status: FESTIVAL_STATUS.APPROVED,
    limit: 100,
  });

  const festivals = mapFestivalsToCards(dbFestivals);

  return (
    <HomeClient festivals={festivals} articles={articles} neighborhoods={neighborhoods} />
  );
}
