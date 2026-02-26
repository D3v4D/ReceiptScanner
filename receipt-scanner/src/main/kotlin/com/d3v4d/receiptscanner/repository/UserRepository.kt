package com.d3v4d.receiptscanner.repository

import com.d3v4d.receiptscanner.entity.UserEntity
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<UserEntity, Long> {

}