package com.d3v4d.receiptscanner.entity

import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant

@Entity
@Table(name = "alerts")
class AlertEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "alerts_gen")
    @SequenceGenerator(name = "alerts_gen", sequenceName = "alerts_seq", allocationSize = 1)
    var id: Long = 0,

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity = UserEntity(),

    @Column(nullable = false)
    var errorCode: String = "",

    @Column(columnDefinition = "TEXT")
    var errorMessage: String? = null,

    // Az LLM által visszaadott részleges vagy hibás JSON
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_json_data")
    var rawJsonData: String? = null,

    @Column(name = "image_url")
    var imageUrl: String? = null,

    @Column(nullable = false)
    var isResolved: Boolean = false,

    @Column(nullable = false)
    var createdAt: Instant = Instant.now()
)