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

@Entity
@Table(name = "store")
class StoreEntity (
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    var id: Long = 0,

    @Column(nullable = false)
    var name: String = "",

    @Column(nullable = false)
    var address: String = "",

    @Column(nullable = false)
    var longitude: BigDecimal = BigDecimal.ZERO,

    @Column(nullable = false)
    var latitude: BigDecimal = BigDecimal.ZERO,

    @ManyToOne
    @JoinColumn(name = "store_chain_id", nullable = false)
    var storeChain: StoreChainEntity? = null
)