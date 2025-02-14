'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Icon from '../helper/MaterialIcon'
import styles from './Footer.module.scss'

export default function Footer() {
  const [cart, setCart] = useState(0)
  const [visibleSearch, setVisibleSearch] = useState(false)
  const [userSignedIn, setUserSignedIn] = useState('/sign-in')
  /**
   * Get cart from Localstorage
   * @returns
   */
  const getCart = async () => await JSON.parse(localStorage.getItem(`cart`))

  useEffect(() => {

  }, [])
  return (

    <footer className={`${styles.footer} d-f-c flex-column`}>
    {/* <div className={`__container`} data-width={`small`}>
      <FooterNav link={link} />

      <div className={`grid grid--fill grid--gap-1 w-100 ${styles['large-nav']}`} style={{ '--data-width': `120px` }}>
        {link.map((item, i) => {
          return (
            <Link key={i} href={`/${item.path}`}>
              {item.name}
            </Link>
          )
        })}
      </div>
    </div>
    <figure>
      <Image src="/logo.svg" alt={`لوگو`} width={48} height={48} priority />
    </figure> */}

    <p>@ {new Date().getFullYear()} PollPal</p>
    <small>Powered by Aratta Labs</small>
  </footer>
  )
}
