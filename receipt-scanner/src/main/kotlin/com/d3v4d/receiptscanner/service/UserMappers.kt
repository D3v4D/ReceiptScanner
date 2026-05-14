package com.d3v4d.receiptscanner.service

import com.d3v4d.receiptscanner.dto.request.UserRequestDTO
import com.d3v4d.receiptscanner.dto.response.UserResponseDTO
import com.d3v4d.receiptscanner.entity.UserEntity

fun UserRequestDTO.toEntity(encodedPassword: String = this.password): UserEntity =
    UserEntity(
        id = 0,
        email = this.email,
        password = encodedPassword,
        username = this.username,
    )

fun UserEntity.toDTO(): UserResponseDTO =
    UserResponseDTO(
        id = this.id,
        email = this.email,
        username = this.username,
    )