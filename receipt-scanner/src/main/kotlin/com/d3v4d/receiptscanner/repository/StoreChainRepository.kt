package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.ReceiptLineEntity
import org.springframework.data.jpa.repository.JpaRepository

interface StoreChainRepository : JpaRepository<ReceiptLineEntity, Long> {
}