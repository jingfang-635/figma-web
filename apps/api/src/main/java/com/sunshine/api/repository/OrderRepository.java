package com.sunshine.api.repository;

import com.sunshine.api.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
  long countByStatus(String status);
}