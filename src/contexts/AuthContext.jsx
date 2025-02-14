'use client'

import React, { useContext, useEffect, useState, useCallback } from 'react'
import ABI from './../abi/unitrade.json'
import LSP0ERC725Account from '@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json'
// import { toast } from '../components/NextToast'
import { Loading } from './../routes/components/Loading'
import toast from 'react-hot-toast'
import Web3 from 'web3'
import { createClientUPProvider } from '@lukso/up-provider'

export const AuthContext = React.createContext()
export const provider = createClientUPProvider()
// export const PROVIDER = import.meta.env.NEXT_PUBLIC_RPC_URL
export const web3 = new Web3(window.lukso)//window.lukso
export const contract = new web3.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)
export const _ = web3.utils

export function useAuth() {
  return useContext(AuthContext)
}

export const isAuth = async () => localStorage.getItem('accessToken')
export const chainID = async () => await web3.eth.getChainId()

export const getIPFS = async (CID) => {
  let requestOptions = {
    method: 'GET',
    redirect: 'follow',
  }
  const response = await fetch(`${import.meta.env.VITE_IPFS_GATEWAY}${CID}`, requestOptions)
  if (!response.ok) return { result: false } //throw new Response('Failed to get data', { status: 500 })
  return response.json()
}

/**
 * Fetch Universal Profile
 * @param {address} addr
 * @returns
 */

export const fetchProfile = async (_addr) => {
  const web3 = new Web3(provider)
  const LSP0ERC725Contract = new web3.eth.Contract(LSP0ERC725Account.abi, _addr)
  try {
    return LSP0ERC725Contract.methods
      .getData('0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5')
      .call()
      .then(async (data) => {
        data = data.substring(6, data.length)
        // console.log(data)
        //  data ="0x" + data.substring(6)
        //  console.log(data)
        // slice the bytes to get its pieces
        const hashFunction = '0x' + data.slice(0, 8)
        // console.log(hashFunction)
        const hash = '0x' + data.slice(76)
        const url = '0x' + data.slice(76)
        // console.log(hashFunction, ' | ', hash, ' | ', url)
        // check if it uses keccak256
        //  if (hashFunction === '0x6f357c6a') {
        // download the json file
        // console.log(`-------------`,web3.utils.hexToUtf8(url).replace('ipfs://', '').replace('://', ''))
        const json = await getIPFS(web3.utils.hexToUtf8(url).replace('ipfs://', '').replace('://', ''))
        return json
      })
  } catch (error) {
    console.log(`fetch profile error => `, error)
    return []
  }
}

export function AuthProvider({ children }) {
  const [wallet, setWallet] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState()
  const [balance, setBalance] = useState(0)

  const [accounts, setAccounts] = useState([])
  const [contextAccounts, setContextAccounts] = useState([]) //0x${string}
  const [profileConnected, setProfileConnected] = useState(false)

  const isWalletConnected = async () => {
    try {
      let accounts = await web3.eth.getAccounts()
      return accounts[0]
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getBalance = async (wallet) => {
    const balance = await web3.eth.getBalance(wallet)
    return parseFloat(web3.utils.fromWei(balance, `ether`)).toFixed(2)
  }

  const connect = async () => {
    let t = toast.loading('Loading...', `loading`)

    try {
      let accounts = await web3.eth.getAccounts()
      if (accounts.length === 0) await web3.eth.requestAccounts()
      accounts = await web3.eth.getAccounts()

      getBalance(accounts[0]).then((balance) => setBalance(balance))
      //console.log(accounts)
      setWallet(accounts[0])
      fetchProfile(accounts[0]).then((res) => {
        console.log(res)
        setProfile(res)
      })

      toast(`UP successfuly connected`, `success`)
      toast.dismiss(t)
      return accounts[0]
    } catch (error) {
      toast(`The provider could not be found.`, `error`)
    }
  }

  // Helper to check connection status
  const updateConnected = useCallback((_accounts, _contextAccounts) => {
    setProfileConnected(_accounts.length > 0 && _contextAccounts.length > 0)
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const _accounts = provider.accounts
        setAccounts(_accounts)

        const _contextAccounts = provider.contextAccounts
        console.log(_contextAccounts)
        updateConnected(_accounts, _contextAccounts)
      } catch (error) {
        console.error('Failed to initialize provider:', error)
      }
    }

    // Handle account changes
    const accountsChanged = (_accounts) => {
      setAccounts(_accounts)
      updateConnected(_accounts, contextAccounts)
    }

    const contextAccountsChanged = (_accounts) => {
      setContextAccounts(_accounts)
      updateConnected(accounts, _accounts)
    }

    init()

    // Set up event listeners
    provider.on('accountsChanged', accountsChanged)
    provider.on('contextAccountsChanged', contextAccountsChanged)

    // Cleanup listeners
    return () => {
      provider.removeListener('accountsChanged', accountsChanged)
      provider.removeListener('contextAccountsChanged', contextAccountsChanged)
    }
  }, [accounts[0], contextAccounts[0], updateConnected])

  const value = {
    accounts,
    contextAccounts,
    profileConnected,
    status,
    loading,
    wallet,
    balance,
    setWallet,
    profile,
    getIPFS,
    fetchProfile,
    setProfile,
    isWalletConnected,
    connect,
  }

 // if (!profileConnected) return <Loading />
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
