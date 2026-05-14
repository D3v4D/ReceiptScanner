package com.d3v4d.receiptscanner.controller

import com.d3v4d.receiptscanner.dto.request.UserRequestDTO
import com.d3v4d.receiptscanner.dto.response.UserResponseDTO
import com.d3v4d.receiptscanner.service.UserService
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/users")
class UserController (
    val userService: UserService,
) {
    @GetMapping
    fun getUsers(): List<UserResponseDTO> =
        userService.getUsers()


    @PostMapping
    fun postUser(
        @RequestBody userDto: UserRequestDTO,
    ): UserResponseDTO =
        userService.addUser(userDto)

    @PutMapping
    fun putUser(
        @RequestBody userDto: UserRequestDTO,
    ): UserResponseDTO {
        TODO()
    }

    @DeleteMapping
    fun deleteUser(
        @RequestBody userDto: UserRequestDTO,
    ) {
        TODO()
    }

}