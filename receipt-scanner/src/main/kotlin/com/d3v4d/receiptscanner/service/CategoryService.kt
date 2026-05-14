package com.d3v4d.receiptscanner.service

import com.d3v4d.receiptscanner.dto.request.CategoryRequestDTO
import com.d3v4d.receiptscanner.dto.response.CategoryResponseDTO
import com.d3v4d.receiptscanner.entity.CategoryEntity
import com.d3v4d.receiptscanner.entity.UserEntity
import com.d3v4d.receiptscanner.repository.CategoryRepository
import com.d3v4d.receiptscanner.repository.UserRepository
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CategoryService(
    private val categoryRepository: CategoryRepository,
    private val userRepository: UserRepository,
) {
    private fun requireAuthenticatedUser(): UserEntity {
        val authentication = SecurityContextHolder.getContext().authentication
            ?: throw AccessDeniedException("Authentication required")
        if (!authentication.isAuthenticated || authentication.principal == "anonymousUser") {
            throw AccessDeniedException("Authentication required")
        }

        val username = when (val principal = authentication.principal) {
            is UserDetails -> principal.username
            is String -> principal
            else -> throw AccessDeniedException("Invalid authentication principal")
        }

        return userRepository.findByUsername(username)
            ?: throw AccessDeniedException("Authenticated user not found")
    }

    fun getCategories(): List<CategoryResponseDTO> {
        val user = requireAuthenticatedUser()
        return categoryRepository.findAllByUserId(user.id).map { it.toDTO() }
    }

    fun getCategory(id: Long): CategoryResponseDTO {
        val user = requireAuthenticatedUser()
        val category = categoryRepository.findByIdAndUserId(id, user.id)
            ?: throw IllegalArgumentException("Category not found or access denied")
        return category.toDTO()
    }

    @Transactional
    fun createCategory(request: CategoryRequestDTO): CategoryResponseDTO {
        val user = requireAuthenticatedUser()
        val category = CategoryEntity(
            name = request.name,
            description = request.description,
            user = user,
        )
        return categoryRepository.save(category).toDTO()
    }

    @Transactional
    fun updateCategory(id: Long, request: CategoryRequestDTO): CategoryResponseDTO {
        val user = requireAuthenticatedUser()
        val category = categoryRepository.findByIdAndUserId(id, user.id)
            ?: throw IllegalArgumentException("Category not found or access denied")
        category.name = request.name
        category.description = request.description
        return categoryRepository.save(category).toDTO()
    }

    @Transactional
    fun deleteCategory(id: Long) {
        val user = requireAuthenticatedUser()
        val category = categoryRepository.findByIdAndUserId(id, user.id)
            ?: throw IllegalArgumentException("Category not found or access denied")
        categoryRepository.delete(category)
    }
}

fun CategoryEntity.toDTO(): CategoryResponseDTO = CategoryResponseDTO(
    id = this.id,
    name = this.name,
    description = this.description,
)
