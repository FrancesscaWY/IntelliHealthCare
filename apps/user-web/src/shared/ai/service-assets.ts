import homeCareImage from "@/assets/service/home-care/home.png";
import elderImage from "@/assets/service/home-care/img_5.png";
import examBasicImage from "@/assets/service/home-care/img_11.png";
import examChronicImage from "@/assets/service/home-care/img_13.png";
import rehabStrokeImage from "@/assets/service/home-care/img_8.png";
import rehabKneeImage from "@/assets/service/home-care/img_10.png";

const imageByServiceId: Record<string, string> = {
  srv_home_clean_2h: homeCareImage,
  srv_home_accompany_doctor: elderImage,
  srv_exam_basic: examBasicImage,
  srv_exam_chronic: examChronicImage,
  srv_rehab_stroke: rehabStrokeImage,
  srv_rehab_knee: rehabKneeImage
};

const fallbackImageByCategory: Record<string, string> = {
  HOME_CARE: homeCareImage,
  HOME_EXAM: examBasicImage,
  REHAB_THERAPY: rehabStrokeImage,
  ELDERLY_CARE: elderImage
};

export function getAiServiceImage(serviceId: string, category: string) {
  return imageByServiceId[serviceId] || fallbackImageByCategory[category] || homeCareImage;
}
