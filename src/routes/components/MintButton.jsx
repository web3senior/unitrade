'use client'

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import LukSelasMemberCard from '../abi/LukSelasMemberCard.json'
import ABI from './../abi/LukSelasMemberCard.json'
import LSP7ABI from './../abi/lsp7.json'
import { useAuth, contract, fishContract, _ } from '../contexts/AuthContext'
import Web3 from 'web3'
import styles from './MintButton.module.scss'

export default function Page() {
  const [status, setStatus] = useState()
  const [pause, setPause] = useState(false)
  const [balance, setBalance] = useState(0)
  const [authorizedAmount, setAuthorizedAmount] = useState(0)
  const [totalSupply, setTotalSupply] = useState(0)
  const MINT_PRICE = 500_000
  const formRef = useRef()
  const auth = useAuth()

  const isPaused = async () => await contract.methods.paused().call()
  const getTotalSupply = async () => await contract.methods.totalSupply().call()
  const getBalance = async () => await fishContract.methods.balanceOf(auth.wallet).call()
  const getAuthorizedAmountFor = async () => fishContract.methods.authorizedAmountFor(process.env.NEXT_PUBLIC_CONTRACT, auth.wallet).call()

  const approve = async (e) => {
    e.preventDefault()

    if (!auth.wallet) {
      toast.error(`Please connect your wallet`)
      return
    }

    setStatus(`loading`)

    const t = toast.loading(`Please wait`)
    try {
      const web3 = new Web3(window.lukso)
      const contract = new web3.eth.Contract(LSP7ABI, process.env.NEXT_PUBLIC_CONTRACT_FISH)
      contract.methods
        .authorizeOperator(process.env.NEXT_PUBLIC_CONTRACT, _.toWei(MINT_PRICE, 'ether'), '0x')
        .send({
          from: auth.wallet,
        })
        .then((res) => {
          console.log(res)
          toast.success(`authorized complete`)
          toast.dismiss(t)

          getAuthorizedAmountFor().then(async (res) => {
            console.log(res)
            setStatus()
            setAuthorizedAmount(_.fromWei(_.toNumber(res), `ether`))
          })
        })
        .catch((error) => {
          console.log(error)
          toast.dismiss(t)
          setStatus()
        })
    } catch (error) {
      toast.error(error)
      console.log(error)
      toast.dismiss(t)
    }
  }

  const mint = async (e) => {
    e.preventDefault()

    setStatus(`loading`)

    const t = toast.loading(`Please wait`)

    try {
      const web3 = new Web3(window.lukso)
      const contract = new web3.eth.Contract(ABI, process.env.NEXT_PUBLIC_CONTRACT)
      contract.methods
        .mint()
        .send({
          from: auth.wallet,
        })
        .then((res) => {
          console.log(res)
          setStatus()

          toast.success(`Mint compelete`)
          toast.dismiss(t)

          // Read totalSupply
          getTotalSupply().then(async (res) => {
            console.log(res)
            setTotalSupply(_.toNumber(res))
          })
        })
        .catch((error) => {
          console.log(error)
          toast.dismiss(t)
          setStatus()
        })
    } catch (error) {
      toast.error(error)
      console.log(error)
      toast.dismiss(t)
      setStatus()
    }
  }

  async function getNFTHolders(contract) {
    console.log(contract)
    let myHeaders = new Headers()
    myHeaders.append('Content-Type', `application/json`)
    myHeaders.append('Accept', `application/json`)

    let requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify({
        query: `query MyQuery {
    Asset(where: {id: {_eq: "${contract.toLowerCase()}"}}) {
      id
      isLSP7
      lsp4TokenName
      lsp4TokenSymbol
      lsp4TokenType
      name
      totalSupply
      owner_id
      holders(order_by: {balance: desc}) {
        balance
      }
      createdTimestamp
    }
  }`,
      }),
    }

    const response = await fetch(`${process.env.LUKSO_API_ENDPOINT}`, requestOptions)
    if (!response.ok) {
      return { result: false, message: `Failed to fetch query` }
    }
    const data = await response.json()

    // Conver numbers from wei to eth
    if (data.data.Asset[0].holders) {
      return { result: true, total: data.data.Asset[0].holders.length }
    }

    return { result: false, message: `Failed to fetch query` }
  }

  useEffect(() => {
    isPaused().then(async (res) => {
      setPause(res)
    })

    getTotalSupply().then(async (res) => {
      setTotalSupply(_.toNumber(res))
    })

    if (auth.wallet) {
      getBalance().then(async (res) => {
        setBalance(_.fromWei(_.toNumber(res), `ether`))
      })

      getAuthorizedAmountFor().then(async (res) => {
        setAuthorizedAmount(_.fromWei(_.toNumber(res), `ether`))
      })
    }
  }, [])

  return (
    <>
      <div className={`d-flex align-items-center justify-content-between grid--gap-2 w-100`} style={{ '--data-width': `100px` }}>
        <div className={`d-flex flex-column align-items`}>
          <span>Mint Price</span>
          <b>500K $FISH</b>
        </div>
        <div className={`d-flex flex-column`}>
          <span>Total Supply</span>
          <b>{18 - totalSupply}/18</b>
        </div>
        <div className={`d-flex flex-column`}>
          <span>Status</span>
          <b>Paused!</b>
        </div>
      </div>

      <div className={`${styles.action} w-100`}>
        <p className={`d-block text-left mb-10`}>Profile Balance: {new Intl.NumberFormat().format(balance)} $FISH</p>

        {!pause ? (
          <>{authorizedAmount < MINT_PRICE ? <button onClick={approve}>{status === `loading` ? `Loading...` : `Approve`}</button> : <button onClick={mint}>{status === `loading` ? `Loading...` : `Mint`}</button>}</>
        ) : (
          <button type="button" onClick={() => toast.error(`Paused`)}>
            Paused
          </button>
        )}
      </div>
    </>
  )
}
