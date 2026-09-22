package com.sunshine.api.repository;

import com.sunshine.api.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PatientRepository extends JpaRepository<Patient, Long> {
  long countByStatus(String status);
}