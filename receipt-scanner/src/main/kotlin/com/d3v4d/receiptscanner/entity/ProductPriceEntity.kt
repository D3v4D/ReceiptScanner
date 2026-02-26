package com.d3v4d.receiptscanner.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table


// This entity is used to store the price of a product at a specific time. It can be used to track price changes over time and to calculate the average price of a product.
@Entity
@Table(
    name = "product_prices"
)
class ProductPriceEntity (
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
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