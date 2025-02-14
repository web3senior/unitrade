import Link from 'next/link'
import Image from 'next/image'
import Icon from '../helper/MaterialIcon'
import ConnectWallet from './ConnectWallet'
import styles from './Header.module.scss'

export default function Header() {
  return (
    <header className={`${styles.header} ms-depth-4`}>
      <div className={`__container d-flex align-items-center justify-content-between`} data-width={`xlarge`}>
        <Link href={`/`} className={`${styles.logo} d-flex align-items-center justify-content-center`}>
          <figure className={`d-flex align-items-center justify-content-center`}>
            <Image src="/logo.svg" alt={`Logo`} width={48} height={48} priority />
            <figcaption>{process.env.NEXT_PUBLIC_NAME}</figcaption>
          </figure>
        </Link>

        <div className={`${styles['wallet-container']} d-flex align-items-center`}>
        <ConnectWallet />
        </div>
      </div>
    </header>
  )
}
