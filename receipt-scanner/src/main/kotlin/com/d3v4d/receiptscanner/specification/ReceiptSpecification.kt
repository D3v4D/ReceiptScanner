package com.d3v4d.receiptscanner.specification

import com.d3v4d.receiptscanner.entity.ReceiptEntity
import com.d3v4d.receiptscanner.entity.ReceiptLineEntity
import com.d3v4d.receiptscanner.entity.UserEntity
import com.d3v4d.receiptscanner.filter.ReceiptFilter
import jakarta.persistence.criteria.JoinType
import org.springframework.data.jpa.domain.Specification
import java.math.BigDecimal

object ReceiptSpecification {

    fun build(
        filter: ReceiptFilter,
        user: UserEntity
    ): Specification<ReceiptEntity> {

        return Specification { root, query, cb ->

            query.distinct(true) // fontos join miatt

            val predicates = mutableListOf<jakarta.persistence.criteria.Predicate>()

            // 🔐 mindig user szerint szűrünk
            predicates += cb.equal(root.get<UserEntity>("user"), user)

            // 🆔 ID filter
            filter.id?.let {
                predicates += cb.equal(root.get<Long>("id"), it)
            }

            // 💰 minimum price — computed as sum of (unitPrice * quantity) via subquery
            filter.minPrice?.let { minPrice ->
                val subquery = query.subquery(BigDecimal::class.java)
                val lineRoot = subquery.from(ReceiptLineEntity::class.java)
                subquery.select(
                    cb.sum(
                        cb.toBigDecimal(
                            cb.prod(
                                lineRoot.get("unitPrice"),
                                lineRoot.get("quantity")
                            )
                        )
                    )
                ).where(cb.equal(lineRoot.get<ReceiptEntity>("receipt"), root))
                predicates += cb.greaterThanOrEqualTo(subquery, minPrice)
            }

            // 💰 maximum price — computed as sum of (unitPrice * quantity) via subquery
            filter.maxPrice?.let { maxPrice ->
                val subquery = query.subquery(BigDecimal::class.java)
                val lineRoot = subquery.from(ReceiptLineEntity::class.java)
                subquery.select(
                    cb.sum(
                        cb.toBigDecimal(
                            cb.prod(
                                lineRoot.get("unitPrice"),
                                lineRoot.get("quantity")
                            )
                        )
                    )
                ).where(cb.equal(lineRoot.get<ReceiptEntity>("receipt"), root))
                predicates += cb.lessThanOrEqualTo(subquery, maxPrice)
            }

            // 📦 include product
            filter.includeProduct?.let {
                val lineJoin = root.join<Any, Any>("lines", JoinType.LEFT)
                predicates += cb.like(
                    cb.lower(lineJoin.get("rawName")),
                    "%${it.lowercase()}%"
                )
            }

            // 🚫 exclude product
            filter.excludeProduct?.let {
                val lineJoin = root.join<Any, Any>("lines", JoinType.LEFT)
                predicates += cb.notLike(
                    cb.lower(lineJoin.get("rawName")),
                    "%${it.lowercase()}%"
                )
            }

            cb.and(*predicates.toTypedArray())
        }
    }
}



