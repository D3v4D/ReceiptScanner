package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.ReceiptLineEntity
import com.d3v4d.receiptscanner.entity.StoreEntity
import org.springframework.data.jpa.repository.JpaRepository

interface StoreRepository: JpaRepository<StoreEntity, Int> {

}