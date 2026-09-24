package com.sunshinemedical.api.repository;

import com.sunshinemedical.api.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
}
