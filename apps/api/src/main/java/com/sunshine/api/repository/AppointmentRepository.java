package com.sunshine.api.repository;

import com.sunshine.api.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
  long countByStatus(String status);
}