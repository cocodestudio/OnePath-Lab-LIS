<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Test extends Model
{
    use HasFactory, HasUuids, CamelCaseApi;

    protected $fillable = [
        'lab_id',
        'test_code',
        'is_json_override',
        'parent_id',
        'name',
        'category',
        'field_type',
        'type',
        'price',
        'unit',
        'gender_ref_type',
        'ref_range_min',
        'ref_range_max',
        'ref_range_min_male',
        'ref_range_max_male',
        'ref_range_min_female',
        'ref_range_max_female',
        'ref_range_min_child',
        'ref_range_max_child',
        'ref_range_min_newborn',
        'ref_range_max_newborn',
        'value_type',
        'custom_options',
        'interpretation',
    ];

    protected $casts = [
        'custom_options' => 'array',
        'price' => 'float',
    ];

    public function lab()
    {
        return $this->belongsTo(Lab::class);
    }

    public function parent()
    {
        return $this->belongsTo(Test::class, 'parent_id');
    }

    public function subTests()
    {
        return $this->hasMany(Test::class, 'parent_id');
    }

    public function reportTests()
    {
        return $this->hasMany(ReportTest::class);
    }
}
