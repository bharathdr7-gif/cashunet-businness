package com.example;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AppTest {
    @Test
    void testGetGreeting() {
        assertEquals("Hello from Maven app!", App.getGreeting());
    }
}
