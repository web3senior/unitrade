import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router'
import { web3, contract, useAuth, _, provider } from './../contexts/AuthContext'
import party from 'party-js'
import ABI from './../abi/unitrade.json'
import LSP7ABI from './../abi/lsp7.json'
import LSP8ABI from './../abi/lsp8.json'
import toast, { Toaster } from 'react-hot-toast'
import Web3 from 'web3'
import VerifiedBadge from './../assets/verified-badge.svg'
import styles from './Home.module.scss'

const web3ReadOnly = new Web3(import.meta.env.VITE_LUKSO_PROVIDER)
const contractReadOnly = new web3ReadOnly.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)

function Home() {
  const [emoji, setEmoji] = useState([])
  const [react, setReact] = useState([])
  const [token, setToken] = useState()
  const [isApproved, setIsApproved] = useState(false)
  const [profiles, setProfiles] = useState()
  let [searchParams] = useSearchParams()
  const auth = useAuth()

  const getListingPool = async (_collection, _tokenId) => await contractReadOnly.methods.listingPool(_collection, _tokenId).call()

  const getAllUserReaction = async () => await contractReadOnly.methods.getAllUserReaction(`${auth.contextAccounts[0]}`).call()

  const chkApproveLSP7 = async (e, tokenInfo) => {
    const contractLSP7 = new web3.eth.Contract(LSP7ABI, tokenInfo.token.toLowerCase())
    console.log(contractLSP7)
    const authorizedAmount = await contractLSP7.methods.authorizedAmountFor(import.meta.env.VITE_CONTRACT,  auth.accounts[0]).call()
    if (authorizedAmount >= tokenInfo.price) {
      setIsApproved(true)
      toast.success(`It's approved already!`)
    } else {
      e.target.innerHTML = `Please wait...`
      const t = toast.loading(`Waiting for transaction's confirmation`)
      const authResult = await contractLSP7.methods.authorizeOperator(import.meta.env.VITE_CONTRACT, tokenInfo.price, '0x').send({ from: auth.accounts[0] })
      toast.dismiss(t)
      e.target.innerHTML = `Approve`
    }
  }

  const buy = async (e, tokenInfo) => {
    const t = toast.loading(`Waiting for transaction's confirmation`)

    // List token
if (tokenInfo.token.toLowerCase() === `0x0000000000000000000000000000000000000000`) {
  contract.methods
  .buy(searchParams.get(`collection`), searchParams.get(`token_id`), `${auth.contextAccounts[0]}`, true, _.toHex(0))
  .send({
    from: auth.accounts[0],
    value: tokenInfo.price
  })
  .then((res) => {
    console.log(res) //res.events.tokenId

    setIsLoading(true)

    toast.success(`Done`)
    toast.dismiss(t)
  })
  .catch((error) => {
    toast.dismiss(t)
  })
}else {
  contract.methods
  .buy(searchParams.get(`collection`), searchParams.get(`token_id`), `${auth.contextAccounts[0]}`, true, _.toHex(0))
  .send({
    from: auth.accounts[0]
  })
  .then((res) => {
    console.log(res) //res.events.tokenId

    setIsLoading(true)

    toast.success(`Done`)
    toast.dismiss(t)
  })
  .catch((error) => {
    toast.dismiss(t)
  })
}
  }
  async function getTokenData(collection, tokenId) {
    collection = collection.toString().toLowerCase()
    tokenId = tokenId.toString().toLowerCase()

    let myHeaders = new Headers()
    myHeaders.append('Content-Type', `application/json`)
    myHeaders.append('Accept', `application/json`)

    let requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify({
        query: `query MyQuery {
  Token(
    where: {lsp8ReferenceContract_id: {_eq: "${collection}"}, _and: {tokenId: {_eq: "${tokenId}"}}}
  ) {
    id
    lsp4TokenName
    name
    tokenId
    lsp8ReferenceContract_id
          lsp4TokenSymbol
    description
    images {
      src
    }
  }
}`,
      }),
    }

    const response = await fetch(`${import.meta.env.VITE_LUKSO_API_ENDPOINT}`, requestOptions)
    if (!response.ok) {
      return { result: false, message: `Failed to fetch query` }
    }
    const data = await response.json()
    return data
  }

  const fetchData = async (dataURL) => {
    let requestOptions = {
      method: 'GET',
      redirect: 'follow',
    }
    const response = await fetch(`${dataURL}`, requestOptions)
    if (!response.ok) throw new Response('Failed to get data', { status: 500 })
    return response.json()
  }

  async function get_lsp7(contract) {
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
    }
  }`,
      }),
    }

    const response = await fetch(`${import.meta.env.VITE_LUKSO_API_ENDPOINT}`, requestOptions)
    if (!response.ok) {
      return { result: false, message: `Failed to fetch query` }
    }
    const data = await response.json()
    return data
  }

  // const getTokenData = async (_collection, _tokenId) => {
  //   const contractLSP8 = new web3.eth.Contract(LSP8ABI, _collection)
  //   return await contractLSP8.methods.getDataForTokenId(`${_tokenId}`, '0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e').call()
  // }

  useEffect(() => {
    getListingPool(searchParams.get(`collection`), searchParams.get(`token_id`)).then((res) => {
      console.log(res)

      getTokenData(searchParams.get(`collection`), searchParams.get(`token_id`)).then((nftData) => {
        nftData.info = res

        if (res.token.toString() !== `0x0000000000000000000000000000000000000000`) {
          get_lsp7(res.token).then((result) => {
            nftData.tokenInfo = result
            setToken(nftData)
          })
        } else {
          setIsApproved(true)
          setToken(nftData)
        }

        console.log(nftData)
      })
    })

    // getAllUserReaction().then(async (res) => {
    //   console.log(res)
    //   if (res.length > 0) setReact(res)

    //   let responses_with_profile = []
    //   await Promise.all(
    //     res.map((response, i) => {
    //       return auth.fetchProfile(response.sender).then((profile) => {
    //         responses_with_profile.push(Object.assign(profile, response))
    //       })
    //     })
    //   )

    //   setProfiles(responses_with_profile)
    // })
  }, [])

  return (
    <div className={`${styles.page} __container`} data-width={`small`}>
      <Toaster />

      {!token && (
        <div>
          <div className={`shimmer ${styles.shimmer}`} />
        </div>
      )}
      {token && token.info.status === false && <div className={`${styles.soldout}`}>Sold Out</div>}
      {token &&
        (token.data ? (
          <>
            <div className={`${styles['item']}  animate__animated animate__fadeInUp`}>
              <figure>
                <img className={`ms-depth-16`} src={`${token.data.Token[0].images[0].src}`} />
              </figure>

              <div className={`${styles['item__body']}`}>
                <div className={`d-flex flex-row grid--gap-025`}>
                  <b>{token.data.Token[0].lsp4TokenName}</b>
                  <img alt={`verified`} src={VerifiedBadge} />
                </div>

                <p>{token.data.Token[0].description.slice(0, 110)}...</p>
              </div>
            </div>

            <div className={`d-flex flex-row align-items-center justify-content-between grid--gap-025 w-100`}>
              <div>
                <small>{_.fromWei(token.info.price, `ether`)}</small>
                <span>{token['info'].token === `0x0000000000000000000000000000000000000000` ? <i> ⏣LYX</i> : <span className={`badge badge-pill badge-primary ml-10`}> ${token['tokenInfo']?.data.Asset[0].lsp4TokenSymbol}</span>}</span>
              </div>
              <Link target={`_blank`} to={`https://universaleverything.io/asset/${searchParams.get(`collection`)}/tokenId/${searchParams.get(`token_id`)}`}>
                View the NFT
              </Link>

              {!isApproved && (
                <button type={`button`} className="mt-20 btn" onClick={(e) => chkApproveLSP7(e, token['info'])}>
                  Approve
                </button>
              )}

              {isApproved && (
                <button className="mt-20 btn" type="submit" onClick={(e) => buy(e, token.info)}>
                  Buy now
                </button>
              )}
            </div>
          </>
        ) : (
          <>Not valid data, please check the token's metadata</>
        ))}

      <ul className={`${styles[`nav`]} d-flex flex-row align-items-center justify-content-between grid--gap-025 w-100`}>
        <li>
          <Link to={`trait`}>home</Link>
        </li>
        <li>
          <Link to={`trait`}>Properties</Link>
        </li>
        <li>
          <Link to={`trait`}>Owner</Link>
        </li>
      </ul>
    </div>
  )
}

export default Home
