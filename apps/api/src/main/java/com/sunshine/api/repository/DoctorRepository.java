package com.sunshine.api.repository;

import com.sunshine.api.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
  long countByStatus(String status);
  List<Doctor> findByStatusOrderByIdAsc(String status);
  long countByDepartmentIdAndStatus(Long deptId, String status);
}