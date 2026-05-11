import Image from "next/image"
import logoDark from "@/public/logo-dark.svg"
import logoLight from "@/public/logo-light.svg"
import styles from "./ThemeLogo.module.css"

export function ThemeLogo() {
  return (
    <>
      <Image
        alt="TON"
        src={logoLight}
        width={100}
        height={100}
        sizes="100px"
        className={`h-8 w-auto ${styles.lightLogo}`}
        aria-label="TON"
      />
      <Image
        alt="TON"
        src={logoDark}
        width={100}
        height={100}
        sizes="100px"
        className={`h-8 w-auto ${styles.darkLogo}`}
        aria-label="TON"
      />
    </>
  )
}
