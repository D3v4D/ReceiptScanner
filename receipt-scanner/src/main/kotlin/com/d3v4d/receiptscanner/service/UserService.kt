package com.d3v4d.receiptscanner.service

import com.d3v4d.receiptscanner.dto.request.UserRequestDTO
import com.d3v4d.receiptscanner.dto.response.UserResponseDTO
import com.d3v4d.receiptscanner.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class UserService (
    val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    fun getUsers(): List<UserResponseDTO> =
        userRepository
            .findAll()
            .map { it.toDTO() }


    fun addUser(user: UserRequestDTO): UserResponseDTO =
        userRepository
            .save(
                user.toEntity(
                    encodedPassword = passwordEncoder.encode(user.password)
                        ?: throw IllegalStateException("Password encoder returned null"),
                ),
            )
            .toDTO()
}