package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.ProductAliasEntity
import org.springframework.data.jpa.repository.JpaRepository

interface ProductAliasRepository : JpaRepository<ProductAliasEntity, Long> {
    fun findByAlias(alias: String): ProductAliasEntity?
}


