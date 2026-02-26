package com.d3v4d.receiptscanner.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.math.BigDecimal

// This entity represents an alias for a product, allowing users to associate different names with the same product.
// It will be useful for OCR results where the product name might be recognized differently, but we want to link it to a known product in our database.
@Entity
@Table(name = "product_alias")
class ProductAliasEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    var id: Long = 0,

    @Column(nullable = false)
    var alias: String = "",

    @Column(nullable = false)
    var confidence: Int = 0,

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    var product: ProductEntity? = null,
)