import { useEffect, useState } from "react";
import { listReceipts } from "../services/ReceiptService";
import type { Receipt } from "../types/receipt.types";

export default function ListReceiptComponent() {
  
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  
  useEffect(() => {
      listReceipts().then((response: Receipt[]) =>{
        setReceipts(response)
        console.log("response: ")
        console.log(response)
      })
    }, [])

  return (
    <div className="container">
      <h2 className="text-center">Blokkok listázva:</h2>
      <table className="table table-striped table-bordered">
        <thead>
          <tr>
            <th>Bolt neve</th>
            <th>Vásárlás dátuma</th>
            <th>összeg</th>
            <th>fizetőeszköz</th>
            <th>vásárolt termékek száma</th>
          </tr>
        </thead>
        <tbody>
          {
            receipts.map(receipt => 
              <tr key={receipt.id}>
                <td>{receipt.storeName}</td>
                <td>{receipt.purchaseDateTime}</td>
                <td>{receipt.total}</td>
                <td>{receipt.currency}</td>
                <td>
                  <a href="">
                    {receipt.items.length} 
                  </a>
                </td>
              </tr>
            )
          }
        </tbody>
      </table>

    </div>
  );
}