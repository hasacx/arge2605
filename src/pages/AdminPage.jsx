import { useEffect, useState } from "react"; import { Card, CardContent } from "@/components/ui/card"; import { Button } from "@/components/ui/button"; import { Input } from "@/components/ui/input"; import { createEssence, deleteEssence, getAllEssences, subscribeToEssences, updateEssence } from "@/lib/supabase/queries"; import { Essence } from "@/lib/types"; import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function EssenceManager() { const [essences, setEssences] = useState<Essence[]>([]); const [newEssence, setNewEssence] = useState(""); const [editEssence, setEditEssence] = useState<Essence | null>(null); const [openEditDialog, setOpenEditDialog] = useState(false);

useEffect(() => { getAllEssences().then(setEssences); const subscription = subscribeToEssences(setEssences); return () => { subscription.unsubscribe(); }; }, []);

const handleCreateEssence = async () => { if (!newEssence.trim()) return; await createEssence(newEssence.trim()); setNewEssence(""); };

const handleDeleteEssence = async (id: number) => { await deleteEssence(id); };

const handleUpdateEssence = async () => { if (editEssence && editEssence.name.trim()) { await updateEssence(editEssence.id, editEssence.name.trim()); setOpenEditDialog(false); } };

return ( <div className="space-y-4"> <div className="flex gap-2"> <Input placeholder="New Essence" value={newEssence} onChange={(e) => setNewEssence(e.target.value)} /> <Button onClick={handleCreateEssence}>Add</Button> </div>

{essences
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((essence) => (
      <Card key={essence.id} className="mb-2">
        <CardContent className="flex items-center justify-between p-2">
          <div className="text-sm">{essence.name}</div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditEssence(essence);
                setOpenEditDialog(true);
              }}
            >
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleDeleteEssence(essence.id)}>
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    ))}

  <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Essence</DialogTitle>
      </DialogHeader>
      <Input
        value={editEssence?.name || ""}
        onChange={(e) => setEditEssence({ ...editEssence!, name: e.target.value })}
      />
      <Button onClick={handleUpdateEssence}>Save</Button>
    </DialogContent>
  </Dialog>
</div>

); }

