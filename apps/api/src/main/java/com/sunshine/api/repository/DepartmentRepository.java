package com.sunshine.api.repository;

import com.sunshine.api.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
  long countByStatus(String status);
}