package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.StoreEntity
import org.springframework.data.jpa.repository.JpaRepository

interface StoreRepository : JpaRepository<StoreEntity, Long> {
    fun findByNameAndAddress(name: String, address: String): StoreEntity?
}