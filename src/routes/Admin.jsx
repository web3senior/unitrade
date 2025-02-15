import { useEffect, useState, Suspense, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import ABI from './../abi/unitrade.json'
import LSP8ABI from './../abi/lsp8.json'
import LSP7ABI from './../abi/lsp7.json'
import ClipboardJS from 'clipboard'
import { web3, contract, useAuth, _, provider } from './../contexts/AuthContext'
import Web3 from 'web3'
import styles from './Admin.module.scss'
import { useLocation } from 'react-router'

// const web3 = new Web3(window.lukso)
// const contract = new web3.eth.Contract(ABI, import.meta.env.VITE_CONTRACT)
// const _ = web3.utils

function Admin() {
  const [isLoading, setIsLoading] = useState(false)
  const [listedTokens, setListedTokens] = useState([])
  const [tokenIds, setTokenIds] = useState([])
  const auth = useAuth()
  const frmListRef = useRef()
  const location = useLocation()

  const fetchData = async (dataURL) => {
    let requestOptions = {
      method: 'GET',
      redirect: 'follow',
    }
    const response = await fetch(`${dataURL}`, requestOptions)
    if (!response.ok) throw new Response('Failed to get data', { status: 500 })
    return response.json()
  }

  const getListingPool = async (_collection, _tokenId) => await contract.methods.listingPool(_collection, _tokenId).call()
  const getListedTokens = async () => await contract.methods.getListedTokens(`${auth.contextAccounts[0]}`).call()
  const getTradePoolfunc = async (_collection, _tokenId) => await contract.methods.getTradePool(_collection, _tokenId).call()

  // const getTokenData = async (_collection, _tokenId) => {
  //   const contractLSP8 = new web3.eth.Contract(LSP8ABI, _collection)
  //   return await contractLSP8.methods.getDataForTokenId(`${_tokenId}`, '0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e').call()
  // }

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

  const listToken = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    const t = toast.loading(`Waiting for transaction's confirmation`)

    const formData = new FormData(e.target)
    const collection = formData.get('collection')
    const tokenId = formData.get('tokenId')
    const token = formData.get('token')
    const price = formData.get('price')
    const referralFee = formData.get('referralFee')

    const contractLSP8 = new web3.eth.Contract(LSP8ABI, collection)

    const isAuthorizedOperator = await contractLSP8.methods.isOperatorFor(import.meta.env.VITE_CONTRACT, tokenId).call()

    try {
      // window.lukso.request({ method: 'eth_requestAccounts' }).then((accounts) => {
      // Approve tokenId

      if (!isAuthorizedOperator) {
        //Authorize then list
        const authResult = await contractLSP8.methods.authorizeOperator(import.meta.env.VITE_CONTRACT, tokenId, '0x').send({ from: auth.accounts[0] })

        console.log(`authorizeOperator result =>`, authResult)

        // List token
        const listResult = await contract.methods.list(collection, tokenId, token, _.toWei(price, `ether`), referralFee).send({ from: auth.accounts[0] })
        console.log(listResult) //res.events.tokenId
        toast.success(`Done`)
        window.location.reload()

        toast.dismiss(t)
      } else {
        // List token
        const listResult = await contract.methods.list(collection, tokenId, token, _.toWei(price, `ether`), referralFee).send({ from: auth.accounts[0] })
        console.log(listResult) //res.events.tokenId
        toast.success(`Done`)
        window.location.reload()

        toast.dismiss(t)
      }

      // })
    } catch (error) {
      console.log(error)
      toast.dismiss(t)
    }
  }

  const cancelListing = async (e, item) => {
    console.log(item)

    const t = toast.loading(`Waiting for transaction's confirmation`)

    try {
      window.lukso.request({ method: 'eth_requestAccounts' }).then((accounts) => {
        // Cancel listing
        contract.methods
          .cancelListing(item.collection, item.tokenId)
          .send({
            from: accounts[0],
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
      })
    } catch (error) {
      console.log(error)
      toast.dismiss(t)
    }
  }

  const updateItem = (e, info) => {
    document.querySelector(`[name="collection"]`).value = info.collection
    document.querySelector(`[name="tokenId"]`).value = info.tokenId
    document.querySelector(`[name="price"]`).value = _.fromWei(info.price, `ether`)
    document.querySelector(`[name="referralFee"]`).value = info.referralFee
    document.querySelector(`[name="token"]`).value = info.token
  }

  const getCollectionIds = async (e) => {
    setIsLoading(true)
    if(e.target.value=== '')setTokenIds([])
    console.log(e.target.value, `${auth.contextAccounts[0]}`)
    const contractLSP8 = new web3.eth.Contract(LSP8ABI, e.target.value.toLowerCase())
    const isAuthorizedOperator = await contractLSP8.methods.tokenIdsOf(`${auth.contextAccounts[0]}`).call()
    console.log(isAuthorizedOperator)
    setTokenIds(isAuthorizedOperator)
    setIsLoading(false)
  }

  useEffect(() => {
    getListedTokens().then((res) => {
      console.log(`listedTokens`, res)

      res.data.map((item, i) => {
        // getTradePoolfunc(item['collection'], item['tokenId']).then((res) => {
        //   console.log(res)
        // })

        getTokenData(item['collection'], item['tokenId']).then((data) => {
          data.info = item
          console.log(data)
          try {
            if (item[`token`].toString().toLowerCase() !== `0x0000000000000000000000000000000000000000`) {
              get_lsp7(item[`token`]).then((result) => {
                console.log(result)
                data.tokenInfo = result

                getListingPool(item['collection'], item['tokenId']).then((result) => {
                  console.log(`result`, result)
                  data.market = result
                  setListedTokens((token) => token.concat(data))
                })
              })
            } else {
              getListingPool(item['collection'], item['tokenId']).then((result) => {
                data.market = result
                setListedTokens((token) => token.concat(data))
              })
            }
          } catch (error) {
            console.log(error)
          }
        })
      })

      //  setListedTokens(res.data)
      //
    })

    new ClipboardJS('.btn')
  }, [])

  return (
    <div className={`${styles.page} ms-motion-slideDownIn`}>
      <Toaster />
      <div className={`__container`} data-width={`xlarge`}>
        <div className="card">
          <div className="card__header d-flex align-items-center justify-content-between">Listed tokens</div>
          <div className="card__body">
            {/* {errors?.email && <span>{errors.email}</span>} */}

            {listedTokens.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Token Id</th>
                    <th>Price</th>
                    <th>Refrral Fee</th>
                    <th>Referral</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {listedTokens.map((item, i) => {
                    return (
                      <tr key={i} className={`animate__animated animate__fadeInUp`} style={{ animationDelay: `${i / 10}s`, '--animate-duration': `400ms` }}>
                        <td className={`d-flex align-items-center`} style={{ columnGap: `1rem` }}>
                          <img className={`rounded ms-depth-16`} style={{ width: `48px` }} src={`${item.data.Token[0].images[0].src}`} />
                          <span className={`badge badge-dark`}>
                            {item['info']?.tokenId.slice(0, 6)}...{item['info']?.tokenId.slice(62)}
                          </span>
                        </td>
                        <td>
                          {_.fromWei(item['info'].price, `ether`)}
                          {item['info'].token === `0x0000000000000000000000000000000000000000` ? <>⏣LYX</> : <span className={`badge badge-pill badge-primary ml-10`}> ${item['tokenInfo']?.data.Asset[0].lsp4TokenSymbol}</span>}
                        </td>
                        <td>{item['info'].referralFee} %</td>
                        <td>{item['market']?.referral} %</td>
                        <td>
                          {item['info'].status ? <span className={`badge badge-success`}>Listed</span> : <span className={`badge badge--danger`}>Canceled/ Sold out</span>}
                          <br />
                          {item['market']?.status ? <span className={`badge badge-success`}>In market</span> : <span className={`badge badge--danger`}>Sold out</span>}
                        </td>

                        <td className={`d-flex flex-column grid--gap-025`}>
                          <button className={`btn`} onClick={(e) => cancelListing(e, item['info'])}>
                            Delete
                          </button>
                          <button className={`btn`} style={{ background: `orange` }} onClick={(e) => updateItem(e, item['info'])}>
                            Update
                          </button>
                          <input type={`hidden`} id={`itemURL${i}`} value={`https://${window.location.host}?collection=${item['info'].collection}&token_id=${item['info'].tokenId}`} />
                          <button className={`btn`} style={{ background: `royalblue` }} data-clipboard-target={`#itemURL${i}`}>
                            Copy Embed Link
                          </button>
                          {/* onClick={(e) => copyEmbedLink(e, item['info'])} */}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <>Not found any listed tokens.</>
            )}
          </div>
        </div>

        <div className={`grid grid--fit grid--gap-1 w-100`} style={{ '--data-width': `300px` }}>
          <div className="card">
            <div className="card__header d-flex align-items-center justify-content-between">List Token & Update</div>
            <div className="card__body">
              {/* {errors?.email && <span>{errors.email}</span>} */}
              <form ref={frmListRef} onSubmit={(e) => listToken(e)} className={`form d-flex flex-column`} style={{ rowGap: '1rem' }}>
                <div>
                  <label htmlFor="">Collection (LSP8 contract address):</label>
                  <input type="text" name="collection" placeholder="Collection contract address" onChange={(e) => getCollectionIds(e)} />
                  <small>{isLoading && <>Fetching...</>}</small>
                </div>

                <div>
                  <label htmlFor="">Token id:</label>
                  <select id="tokens" name="tokenId">
                    {tokenIds.length > 0 &&
                      tokenIds.map((item, i) => {
                        return (
                          <option key={i} value={`${item}`}>
                            {item}
                          </option>
                        )
                      })}
                  </select>
                </div>

                <div>
                  Purchase Token:
                  <select name="token" id="">
                    <option value="0x0000000000000000000000000000000000000000">⏣LYX</option>
                    <option value="0xf76253bddf123543716092e77fc08ba81d63ff38">$FISH</option>
                  </select>
                </div>

                <div>
                  Price:
                  <input type="text" name="price" placeholder="Price" required />
                </div>

                <div>
                  Referral fee:
                  <input type="text" name="referralFee" placeholder="Price" defaultValue={0} required />
                </div>

                <button className="mt-20 btn" type="submit" disabled={tokenIds.length === 0}>
                  Approve & List
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin
