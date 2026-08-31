import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  orderNo: string;

  @IsInt()
  patientId: number;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsString()
  type: string;
  @IsOptional()
  @IsString()
  doctorName?: string;
  @IsOptional()
  @IsString()
  department?: string;
  @IsOptional()
  @IsString()
  payMethod?: string;
  @IsOptional()
  @IsString()
  paidAt?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  orderNo?: string;

  @IsOptional()
  @IsInt()
  patientId?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;
  @IsOptional()
  @IsString()
  doctorName?: string;
  @IsOptional()
  @IsString()
  department?: string;
  @IsOptional()
  @IsString()
  payMethod?: string;
  @IsOptional()
  @IsString()
  paidAt?: string;
}
