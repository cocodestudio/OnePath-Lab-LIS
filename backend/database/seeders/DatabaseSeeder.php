<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create a Test Lab
        $lab = \App\Models\Lab::firstOrCreate(
            ['email' => 'admin@onepath.in'],
            [
                'name' => 'OnePath Demo Lab',
                'address' => '123 Health Street, Medical District',
                'print_header_height' => 40,
                'print_footer_height' => 40,
            ]
        );

        // 2. Create an Admin User for this Lab
        $user = User::firstOrCreate(
            ['email' => 'admin@onepath.in'],
            [
                'name' => 'Admin User',
                'phone' => '9876543210',
                'lab_name' => 'OnePath Demo Lab',
                'patient_count' => '51-200',
                'password' => Hash::make('password123'), 
                'lab_id' => $lab->id,
                'role' => 'ADMIN',
                'status' => 'active'
            ]
        );

        // 3. Tests are now loaded dynamically from JSON
        // For the dummy reports, we will copy a few JSON tests into the DB for this lab
        $jsonTests = json_decode(file_get_contents(database_path('data/default_tests.json')), true);
        $cbcData = $jsonTests[0]; // CBC
        $cbcData['lab_id'] = $lab->id;
        $cbcData['test_code'] = $cbcData['testCode'];
        $cbcData['is_json_override'] = true;
        $subTests = $cbcData['subTests'];
        unset($cbcData['subTests'], $cbcData['testCode']);
        $cbc = \App\Models\Test::create($cbcData);
        
        $hb = null; $wbc = null;
        foreach ($subTests as $sub) {
            $sub['lab_id'] = $lab->id;
            $sub['parent_id'] = $cbc->id;
            $sub['test_code'] = $sub['testCode'];
            unset($sub['subTests'], $sub['testCode']);
            $createdSub = \App\Models\Test::create($sub);
            if ($createdSub->test_code === 'SYS_CBC_01_HB') $hb = $createdSub;
            if ($createdSub->test_code === 'SYS_CBC_01_WBC') $wbc = $createdSub;
        }

        // 4. Create Patients and Reports
        for ($i = 1; $i <= 5; $i++) {
            $patient = \App\Models\Patient::create([
                'custom_id' => 'LAB-2026-000' . $i,
                'lab_id' => $lab->id,
                'name' => 'Test Patient ' . $i,
                'designation' => 'Mr.',
                'age' => 20 + $i * 5,
                'gender' => $i % 2 == 0 ? 'Female' : 'Male',
                'phone' => '987654321' . $i,
                'ref_doctor' => 'Dr. Smith',
            ]);

            $bill = \App\Models\Bill::create([
                'custom_id' => 'BILL-2026-000' . $i,
                'lab_id' => $lab->id,
                'patient_id' => $patient->id,
                'total' => 1300,
                'discount' => 0,
                'paid_amount' => 1300,
                'status' => 'PAID',
            ]);

            $report = \App\Models\Report::create([
                'custom_id' => 'REP-2026-000' . $i,
                'lab_id' => $lab->id,
                'bill_id' => $bill->id,
                'patient_id' => $patient->id,
                'status' => $i % 2 == 0 ? 'COMPLETED' : 'PENDING',
            ]);

            \App\Models\ReportTest::create([
                'report_id' => $report->id,
                'test_id' => $hb->id,
                'result_value' => $i % 2 == 0 ? '14.5' : null,
                'is_abnormal' => false,
            ]);

            \App\Models\ReportTest::create([
                'report_id' => $report->id,
                'test_id' => $wbc->id,
                'result_value' => null,
                'is_abnormal' => false,
            ]);
        }
    }
}