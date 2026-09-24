import { useState } from 'react';
import { resolveAssetUrl } from '../utils/assetUrl';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback: React.ReactNode;
}

export default function Avatar({ src, alt = '', className = '', fallback }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const resolved = resolveAssetUrl(src);

  if (!resolved || failedUrl === resolved) return <>{fallback}</>;

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      onError={() => setFailedUrl(resolved)}
    />
  );
}
