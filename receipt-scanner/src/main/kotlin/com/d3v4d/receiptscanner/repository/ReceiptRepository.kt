package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.ReceiptEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface ReceiptRepository
    : JpaRepository<ReceiptEntity, Long>,
    JpaSpecificationExecutor<ReceiptEntity> {

    fun findByIdAndUserId(id: Long, userId: Long): ReceiptEntity?

}