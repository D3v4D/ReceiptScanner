package com.d3v4d.receiptscanner.service

import com.d3v4d.receiptscanner.repository.UserRepository
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class AuthUserDetailsService(
    private val userRepository: UserRepository,
) : UserDetailsService {
    override fun loadUserByUsername(username: String): UserDetails {
        val user = userRepository.findByUsernameOrEmail(username, username)
            ?: throw UsernameNotFoundException("User not found")

        return User.builder()
            .username(user.username)
            .password(user.password)
            .authorities("USER")
            .build()
    }
}
