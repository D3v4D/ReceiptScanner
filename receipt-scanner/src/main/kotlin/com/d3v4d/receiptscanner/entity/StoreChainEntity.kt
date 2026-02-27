package com.d3v4d.receiptscanner.entity

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.SequenceGenerator
import jakarta.persistence.Table

@Entity
@Table(name = "store_chain")
class StoreChainEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "store_chain_gen")
    @SequenceGenerator(name = "store_chain_gen", sequenceName = "store_chain_seq", allocationSize = 1)
    var id: Long = 0,

    @Column(nullable = false, unique = true)
    var name: String = "",

    @OneToMany(mappedBy = "storeChain", cascade = [CascadeType.ALL], orphanRemoval = true)
    var stores: MutableList<StoreEntity> = mutableListOf()
)