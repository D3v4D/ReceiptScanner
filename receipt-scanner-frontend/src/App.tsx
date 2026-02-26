import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import ListReceiptComponent from './components/ListReceiptComponent'

function App() {
  const [count, setCount] = useState(0)

  return (
    <ListReceiptComponent/>
  )
}

export default App
