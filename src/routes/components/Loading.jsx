import React from 'react'
import styles from './Loading.module.scss'

export const Loading = () => (
  <div className={styles['loading']}>
    <div className={`${styles['loading__container']} d-f-c flex-column`}>
      <figure>
        <img alt={`Loading`} src={`/logo.svg`} width={48} height={48}/>
      </figure>
      <div />
    </div>
  </div>
)
