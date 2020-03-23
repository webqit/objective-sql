<?php
namespace Rays\Framework\Database\Query\Relationship;

use Rays\Framework\Registry\Registry;
use Rays\Kernel\Interpreter\Expression;
use Rays\Framework\Model\Model;
use Rays\Framework\Model\ModelInterface;
use Rays\Framework\Database\Query\Interfaces\QueryInterface;
use Rays\Framework\Database\Blueprint\Blueprint;
use Rays\Kernel\Utils\Str;
use Facades\{
	Rays\Framework\Database\Query\Read,
	Rays\Framework\Database\Query\Write
};

class RelationistParam {

	protected $query;
	protected $model;
	
	/**
	 * @var string
	 */
	public $originalPath;
	
	/**
	 * @var string
	 */
	public $originalAlias;
	
	/**
	 * @param Blueprint
	 */
	public $blueprint;
	
	/**
	 * @var string
	 */
	public $tableName;
	
	/**
	 * @var string
	 */
	public $primaryKey;
	
	/**
	 * @var string
	 */
	public $actingKey;
	
	/**
	 * @var string
	 */
	public $leaf;
	
	/**
	 * @var string
	 */
	public $preTarget;
	
	/**
	 * @var string
	 */
	public $postTarget;
	
	/**
	 * @var int
	 */
	public $id;
	
	/**
	 * @var int
	 */
	public $skip;
	
	/**
	 * @var int
	 */
	public $take;
	
	/**
	 * @var string
	 */
	public $order;
	
	public function __construct($modelOrQuery = null) {
		if ($modelOrQuery instanceof QueryInterface) {
			$this->query = $modelOrQuery;
		} elseif ($modelOrQuery instanceof ModelInterface) {
			$this->model = $modelOrQuery;
		}
	}
	
	/**
	 * Creates a Query object from the tableName
	 *
	 * @return \Rays\Framework\Database\Query\Interfaces\QueryInterface
	 */
	public function query($type = 'read') {
		if (!$this->query) {
			$this->query = $type === 'write' ? Write::table($this->tableName) : Read::table($this->tableName);
			// Apply filters
			if (is_numeric($this->id)) {
				$this->query->where($this->blueprint()->conventions->primaryKey, new Epression($this->id));
			} else {
				if (is_numeric($this->skip)) {
					$this->query->skip($this->skip);
				}
				if (is_numeric($this->take)) {
					$this->query->take($this->take);
				}
				if ($this->order) {
					$this->query->orderBy($this->blueprint()->conventions->primaryKey, $this->order);
				}
			}
		}
		
		return $this->query;
	}
	
	/**
	 * Creates a Query object from the tableName
	 *
	 * @return \Rays\Framework\Model\ModelInterface
	 */
	public function model() {
		if (!$this->model) {
			$this->model = Model::make($this->tableName);
			// Apply filters
			if (is_numeric($this->id)) {
				$this->model->withKey($this->blueprint()->conventions->primaryKey, $this->id);
			} else {
				if (is_numeric($this->skip)) {
					$this->model->skip($this->skip);
				}
				if (is_numeric($this->take)) {
					$this->model->take($this->take);
				}
				if ($this->order) {
					$this->model->orderBy($this->blueprint()->conventions->primaryKey, $this->order);
				}
			}
		}
		
		return $this->model;
	}
	
	/**
	 * Returns the blueprint created and assigned during relationship evaluation.
	 *
	 * @return \Rays\Framework\Database\Blueprint\Blueprint
	 */
	public function blueprint() {
		return $this->blueprint;
	}
	
	/**
	 * Returns a string that reperensts the path to table.
	 * Actually rebuilds the path.
	 *
	 * @return string
	 */
	public function subject() {
		$preTarget = $this->preTarget;
		// How did preTarget hit target? Like "->" or "<-" (incoming reference)?
		if (($arrow = Str::before($this->tableName, Str::after($preTarget, $this->originalPath))) && $arrow === '<-') {
			$preTarget .= $arrow;
			// Then the target...
			$preTarget .= $this->tableName;
		}
		return $preTarget;
	}
}