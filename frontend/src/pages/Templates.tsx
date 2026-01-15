import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Copy, Trash2, X } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { templates, Template, TemplateCategory, templateCategoryLabels, getTemplateCategoryClass } from '@/data/templates';
import { toast } from '@/hooks/use-toast';

const Templates = () => {
  const [allTemplates, setAllTemplates] = useState(templates);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied!',
      description: 'Template copied to clipboard',
    });
  };

  const handleDelete = (id: string) => {
    setAllTemplates((prev) => prev.filter((t) => t.id !== id));
    toast({
      title: 'Deleted',
      description: 'Template has been removed',
    });
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleSave = (template: Partial<Template>) => {
    if (editingTemplate) {
      setAllTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? { ...t, ...template } : t))
      );
    } else {
      const newTemplate: Template = {
        id: `t${Date.now()}`,
        name: template.name || 'Untitled',
        category: template.category || 'general',
        content: template.content || '',
        usageCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setAllTemplates((prev) => [newTemplate, ...prev]);
    }
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Response Templates</h1>
            <p className="text-muted-foreground mt-1">
              {allTemplates.length} templates saved
            </p>
          </div>
          <Button onClick={handleCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Template
          </Button>
        </div>

        {/* Templates List */}
        <div className="space-y-4">
          {allTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-premium group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold">{template.name}</h3>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTemplateCategoryClass(template.category)}`}>
                      {templateCategoryLabels[template.category]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 italic line-clamp-2">
                    {template.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    Used {template.usageCount} times
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCopy(template.content)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <TemplateModal
              template={editingTemplate}
              onClose={() => {
                setIsModalOpen(false);
                setEditingTemplate(null);
              }}
              onSave={handleSave}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </MainLayout>
  );
};

interface TemplateModalProps {
  template: Template | null;
  onClose: () => void;
  onSave: (template: Partial<Template>) => void;
}

const TemplateModal = ({ template, onClose, onSave }: TemplateModalProps) => {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState<TemplateCategory>(template?.category || 'general');
  const [content, setContent] = useState(template?.content || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, category, content });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl shadow-lg z-50 p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Thank You Reply"
              className="input-premium w-full"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
              className="input-premium w-full"
            >
              {Object.entries(templateCategoryLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Template Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your template here..."
              rows={5}
              maxLength={500}
              className="input-premium w-full resize-none"
              required
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {content.length}/500 characters
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 btn-secondary">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 btn-primary">
              Save
            </Button>
          </div>
        </form>
      </motion.div>
    </>
  );
};

export default Templates;
