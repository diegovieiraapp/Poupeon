import { useEffect } from 'react';

interface AdSenseProps {
  client: string;
  slot: string;
  format?: string;
  responsive?: boolean;
  style?: React.CSSProperties;
}

const AdSense: React.FC<AdSenseProps> = ({ client, slot, format = 'auto', responsive = true, style = {} }) => {
  useEffect(() => {
    try {
      // Push the command to load ads
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (error) {
      console.error('Error loading AdSense:', error);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={style}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive}
    />
  );
};

export default AdSense;