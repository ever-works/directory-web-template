import { PaymentPlan } from "@/lib/constants";
import { usePricingFeatures } from "./use-pricing-features";
import {
  FileText,
  ImageIcon,
  Globe,
  Eye,
  Clock,
  Mail,
  Shield,
  Zap,
  Share2,
  BarChart3,
  TrendingUp,
  Star,
  Video,
  Phone,
} from "lucide-react";

export interface SuccessPageFeature {
  icon: any;
  text: string;
  color: string;
}

export function useSuccessPageFeatures() {
  const { getFeaturesByPlan } = usePricingFeatures();

  const getPlanFeaturesWithIcons = (planType: PaymentPlan): SuccessPageFeature[] => {
    const planFeatures = getFeaturesByPlan(planType);

    // Icon and color mapping based on feature index
    // This ensures we use exactly the same texts without duplication
    const getIconAndColor = (planType: PaymentPlan, index: number) => {
      if (planType === PaymentPlan.FREE) {
        const freeIcons = [
          { icon: FileText, color: "text-blue-400" },     
          { icon: ImageIcon, color: "text-green-400" },  
          { icon: Globe, color: "text-purple-400" },      
          { icon: Eye, color: "text-orange-400" },        
          { icon: Eye, color: "text-orange-400" },        
          { icon: Clock, color: "text-gray-400" },        
          { icon: Mail, color: "text-red-400" },          
          { icon: Mail, color: "text-red-400" },          
        ];
        return freeIcons[index] || { icon: FileText, color: "text-gray-400" };
      }

      if (planType === PaymentPlan.STANDARD) {
        const standardIcons = [
          { icon: FileText, color: "text-blue-400" },     
          { icon: FileText, color: "text-blue-400" },     
          { icon: ImageIcon, color: "text-green-400" },   
          { icon: Shield, color: "text-yellow-400" },     
          { icon: Zap, color: "text-purple-400" },        
          { icon: Share2, color: "text-orange-400" },     
          { icon: BarChart3, color: "text-pink-400" },    
          { icon: Mail, color: "text-red-400" },          
          { icon: FileText, color: "text-cyan-400" },     
        ];
        return standardIcons[index] || { icon: FileText, color: "text-gray-400" };
      }

      if (planType === PaymentPlan.PREMIUM) {
        const premiumIcons = [
          { icon: TrendingUp, color: "text-yellow-400" }, 
          { icon: TrendingUp, color: "text-yellow-400" }, 
          { icon: Star, color: "text-blue-400" },         
          { icon: Shield, color: "text-green-400" },      
          { icon: Video, color: "text-purple-400" },      
          { icon: ImageIcon, color: "text-orange-400" },  
          { icon: Globe, color: "text-pink-400" },        
          { icon: Mail, color: "text-cyan-400" },         
          { icon: BarChart3, color: "text-red-400" },     
          { icon: Phone, color: "text-indigo-400" },      
          { icon: Zap, color: "text-green-400" },         
        ];
        return premiumIcons[index] || { icon: FileText, color: "text-gray-400" };
      }

      return { icon: FileText, color: "text-gray-400" };
    };

    // Convert hook features to format with icons
    // Uses exactly the same texts as usePricingFeatures
    return planFeatures.map((feature, index) => {
      const { icon, color } = getIconAndColor(planType, index);
      return {
        icon,
        text: feature.text, // Uses exactly the same text from main hook
        color
      };
    });
  };

  return {
    getPlanFeaturesWithIcons
  };
}
