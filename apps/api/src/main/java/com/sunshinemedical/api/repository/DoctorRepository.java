package com.sunshinemedical.api.repository;

import com.sunshinemedical.api.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
}
