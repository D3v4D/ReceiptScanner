package com.d3v4d.receiptscanner.controller

import com.d3v4d.receiptscanner.dto.request.LoginRequestDTO
import com.d3v4d.receiptscanner.dto.response.UserResponseDTO
import com.d3v4d.receiptscanner.repository.UserRepository
import com.d3v4d.receiptscanner.service.toDTO
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.web.context.HttpSessionSecurityContextRepository
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authenticationManager: AuthenticationManager,
    private val userRepository: UserRepository,
) {
    @PostMapping("/login")
    fun login(
        @RequestBody request: LoginRequestDTO,
        httpRequest: HttpServletRequest,
    ): UserResponseDTO {
        val authentication = authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken(request.identifier, request.password),
        )

        SecurityContextHolder.getContext().authentication = authentication
        val session = httpRequest.getSession(true)
        session.setAttribute(
            HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
            SecurityContextHolder.getContext(),
        )

        val username = (authentication.principal as UserDetails).username
        val user = userRepository.findByUsername(username)
            ?: throw IllegalStateException("Authenticated user not found")

        return user.toDTO()
    }

    @GetMapping("/me")
    fun me(authentication: Authentication): UserResponseDTO {
        val username = (authentication.principal as UserDetails).username
        val user = userRepository.findByUsername(username)
            ?: throw IllegalStateException("Authenticated user not found")

        return user.toDTO()
    }

    @PostMapping("/logout")
    fun logout(
        authentication: Authentication?,
        request: HttpServletRequest,
        response: HttpServletResponse,
    ) {
        SecurityContextLogoutHandler().logout(request, response, authentication)
    }
}
