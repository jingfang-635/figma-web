package com.sunshinemedical.api.repository;

import com.sunshinemedical.api.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

  /** 某科室下的医生数（Doctor.deptId 存的是科室 id 的字符串形式） */
  long countByDeptId(String deptId);
}
