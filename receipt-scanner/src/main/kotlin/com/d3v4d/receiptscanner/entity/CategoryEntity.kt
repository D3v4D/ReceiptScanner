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

@Entity
@Table(name = "categories")
class CategoryEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "categories_gen")
    @SequenceGenerator(name = "categories_gen", sequenceName = "categories_seq", allocationSize = 1)
    var id: Long = 0,

    @Column(nullable = false)
    var name: String = "",

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null,

    @Column(nullable = true)
    var description: String? = null
)
