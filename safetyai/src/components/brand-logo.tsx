import Image from "next/image";
import styles from "./brand-logo.module.css";

type BrandLogoProps = {
  variant?: "sidebar" | "header" | "footer";
};

export function BrandLogo({ variant = "sidebar" }: BrandLogoProps) {
  const size = variant === "sidebar" ? 48 : variant === "header" ? 30 : 26;

  return (
    <span className={`${styles.logo} ${styles[variant]}`}>
      <Image
        src="/brand/safetyai-mark-v1.png"
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        loading="eager"
        className={styles.mark}
      />
      <span className={styles.type}>
        <strong className={styles.wordmark}>
          Safety<span className={styles.ai}>AI</span>
        </strong>
        {variant === "sidebar" ? (
          <small className={styles.tagline}>CONSTRUCTION INTELLIGENCE</small>
        ) : null}
      </span>
    </span>
  );
}
