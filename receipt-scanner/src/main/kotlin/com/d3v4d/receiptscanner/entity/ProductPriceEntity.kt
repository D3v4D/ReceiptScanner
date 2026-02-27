package com.d3v4d.receiptscanner.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Table

// ...existing code...
@Entity
@Table(name = "product_prices")
class ProductPriceEntity (
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "product_prices_gen")
    @SequenceGenerator(name = "product_prices_gen", sequenceName = "product_prices_seq", allocationSize = 1)
    var id: Long = 0,

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    var product: ProductEntity? = null,

    @Column(nullable = false)
    var price: Long = 0,

    @Column(nullable = false)
    var validFrom: Long = System.currentTimeMillis(),

    @Column(nullable = true)
    var validLast: Long? = null,
)